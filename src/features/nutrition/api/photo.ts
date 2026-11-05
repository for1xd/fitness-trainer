import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { z } from 'zod';

import { getArtifactSample, isSampleError } from '@/lib/artifactHost';
import { supabase } from '@/lib/supabase';

import {
  applyKnownDishes,
  buildSystemPrompt,
  userPrompt,
  validateMealAnalysis,
  type KnownDish,
} from '../../../../supabase/functions/_shared/mealAnalysis';
import { SEED_FOODS } from '../data/foods';

/** Довша сторона фото перед завантаженням: досить для розпізнавання, легше й дешевше. */
const MAX_SIDE = 1280;

export type PhotoErrorKey =
  | 'notConfigured'
  | 'upload'
  | 'refused'
  | 'busy'
  | 'tooLarge'
  | 'notFood'
  | 'network'
  | 'artifactDenied'
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
  // Без сервера або без входу — розпізнавання через Claude в артефакті
  if (!supabase) return analyzeInArtifact(base64, hint);
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return analyzeInArtifact(base64, hint);

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

// ─────────── Артефакт Claude: розпізнавання через можливість `sample` (без сервера) ───────────

const KNOWN_DISHES: KnownDish[] = SEED_FOODS.filter((f) => f.source === 'ua_dish' && f.slug).map(
  (f) => ({
    slug: f.slug!,
    name: f.name,
    per100: f.per100,
  }),
);
const DISHES = new Map(KNOWN_DISHES.map((d) => [d.slug, d]));

const JSON_SHAPE = `Reply with ONLY one JSON object, no other text, exactly in this shape:
{"is_food": boolean, "dish_name_uk": string, "items": [{"name_uk": string, "match_slug": string | null, "grams": number, "kcal": number, "protein_g": number, "fat_g": number, "carbs_g": number, "confidence": number}], "overall_confidence": number, "notes_uk": string}`;

async function analyzeInArtifact(base64: string, hint?: string): Promise<PhotoAnalysisResponse> {
  const sample = await getArtifactSample();
  if (!sample) throw new PhotoError('notConfigured');
  const image = new Blob([base64ToBytes(base64)], { type: 'image/jpeg' });
  const prompt = `${buildSystemPrompt(KNOWN_DISHES)}\n\nThe attached image is the meal photo.\n${userPrompt(hint)}\n\n${JSON_SHAPE}`;
  let raw: unknown;
  try {
    raw = await sample.json(prompt, { images: [image], modelTier: 'default' });
  } catch (e) {
    const code = isSampleError(e) ? e.code : '';
    if (
      [
        'not_granted',
        'sampling_disabled',
        'images_unavailable',
        'not_declared',
        'capability_disabled',
      ].includes(code)
    ) {
      throw new PhotoError('artifactDenied');
    }
    if (code === 'rate_limited') throw new PhotoError('busy');
    if (code === 'refused') throw new PhotoError('refused');
    if (code === 'image_rejected') throw new PhotoError('tooLarge');
    throw new PhotoError('generic');
  }
  const validated = validateMealAnalysis(raw, new Set(DISHES.keys()));
  if (!validated) throw new PhotoError('generic');
  if (!validated.isFood) throw new PhotoError('notFood');
  return {
    analysisId: null,
    model: 'claude-artifact',
    analysis: applyKnownDishes(validated, DISHES),
  };
}

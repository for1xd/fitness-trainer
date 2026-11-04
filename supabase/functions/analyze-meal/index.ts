// Edge Function: розпізнавання страви по фото через Claude (vision + structured outputs).
// POST { storagePath: string, hint?: string } з JWT користувача → { analysisId, analysis }
// Фото вже лежить у приватному бакеті meal-photos/{user_id}/…; функція читає його з правами користувача.
// Секрети: ANTHROPIC_API_KEY (обов'язково), CLAUDE_MODEL (необов'язково, за замовчуванням claude-opus-5-5).
// Деплой: npx supabase functions deploy analyze-meal

import Anthropic from 'npm:@anthropic-ai/sdk@1.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

import {
  applyKnownDishes,
  buildSystemPrompt,
  MAX_IMAGE_BYTES,
  MEAL_ANALYSIS_SCHEMA,
  sniffImageType,
  userPrompt,
  validateMealAnalysis,
} from '../_shared/mealAnalysis.ts';
import { UA_DISHES } from '../_shared/uaDishes.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5';
// Системний промпт незмінний між запитами — кешується
const SYSTEM_PROMPT = buildSystemPrompt(UA_DISHES);
const DISHES = new Map(UA_DISHES.map((d) => [d.slug, d]));
const SLUGS = new Set(DISHES.keys());

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY з секретів функції

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Клієнт Supabase з правами користувача: RLS пускає лише до власних фото й записів
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  let storagePath = '';
  let hint: string | undefined;
  try {
    const body = (await req.json()) as { storagePath?: unknown; hint?: unknown };
    storagePath = typeof body.storagePath === 'string' ? body.storagePath : '';
    hint = typeof body.hint === 'string' ? body.hint : undefined;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!storagePath.startsWith(`${user.id}/`) || storagePath.includes('..')) {
    return json({ error: 'invalid_path' }, 400);
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from('meal-photos')
    .download(storagePath);
  if (downloadError || !file) return json({ error: 'photo_not_found' }, 404);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: 'photo_too_large' }, 413);
  const mediaType = sniffImageType(bytes);
  if (!mediaType) return json({ error: 'unsupported_image' }, 415);

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Відмова класифікаторів безпеки → сервер сам повторює запит на рекомендованій моделі
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: MEAL_ANALYSIS_SCHEMA },
      },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: encodeBase64(bytes) },
            },
            { type: 'text', text: userPrompt(hint) },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (error instanceof Anthropic.APIError) {
      console.error('[analyze-meal] Claude API', error.status, error.message);
      return json({ error: 'model_error' }, 502);
    }
    console.error('[analyze-meal] network', String(error));
    return json({ error: 'model_unreachable' }, 502);
  }

  if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
  if (response.stop_reason === 'max_tokens') return json({ error: 'incomplete' }, 502);

  const text = response.content.find((b) => b.type === 'text');
  let parsed: unknown = null;
  try {
    parsed = text && text.type === 'text' ? JSON.parse(text.text) : null;
  } catch {
    parsed = null;
  }
  const validated = validateMealAnalysis(parsed, SLUGS);
  if (!validated) return json({ error: 'invalid_model_output' }, 502);
  const analysis = applyKnownDishes(validated, DISHES);

  const { data: row, error: insertError } = await supabase
    .from('meal_photo_analyses')
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      model: response.model,
      raw_json: parsed,
      overall_confidence: analysis.overallConfidence,
    })
    .select('id')
    .single();
  if (insertError) console.warn('[analyze-meal] save analysis:', insertError.message);

  return json({ analysisId: row?.id ?? null, model: response.model, analysis });
});

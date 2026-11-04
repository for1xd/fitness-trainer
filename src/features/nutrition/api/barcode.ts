import { z } from 'zod';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { mapOffProduct } from '../../../../supabase/functions/_shared/foodMappers';
import { normalizeBarcode } from '../logic/barcode';
import { useNutrition } from '../store';
import type { Food } from '../types';
import type { RemoteFood } from './remoteSearch';

const remoteSchema = z.object({
  foods: z.array(
    z.object({
      source: z.enum(['off', 'usda']),
      externalId: z.string(),
      name: z.string(),
      brand: z.string().optional(),
      barcode: z.string().optional(),
      per100: z.object({
        kcal: z.number(),
        proteinG: z.number(),
        fatG: z.number(),
        carbsG: z.number(),
      }),
      servingG: z.number().optional(),
    }),
  ),
});

export type BarcodeResult =
  { kind: 'local'; food: Food } | { kind: 'remote'; food: RemoteFood } | { kind: 'notFound' };

/**
 * Пошук товару за штрихкодом: спершу власні продукти, далі Open Food Facts
 * (через Edge Function, а без сервера — напряму: ключ не потрібен).
 */
export async function lookupBarcode(raw: string): Promise<BarcodeResult> {
  const code = normalizeBarcode(raw);
  const local = useNutrition.getState().userFoods.find((f) => f.barcode === code);
  if (local) return { kind: 'local', food: local };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('food-search', {
      body: { barcode: code },
    });
    if (error) throw error;
    const food = remoteSchema.parse(data).foods[0];
    return food ? { kind: 'remote', food } : { kind: 'notFound' };
  }

  const fields = 'code,product_name,product_name_uk,brands,serving_quantity,nutriments';
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}&lc=uk`,
  );
  if (!res.ok) {
    if (res.status === 404) return { kind: 'notFound' };
    throw new Error(`Open Food Facts ${res.status}`);
  }
  const body = (await res.json()) as { status?: number; product?: unknown };
  const food = body.status === 1 && body.product ? mapOffProduct(body.product as never) : null;
  return food ? { kind: 'remote', food } : { kind: 'notFound' };
}

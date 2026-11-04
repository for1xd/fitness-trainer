import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const remoteFoodSchema = z.object({
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
});

export type RemoteFood = z.infer<typeof remoteFoodSchema>;

const responseSchema = z.object({ foods: z.array(remoteFoodSchema) });

async function searchRemote(query: string): Promise<RemoteFood[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.functions.invoke('food-search', { body: { query } });
  if (error) throw error;
  return responseSchema.parse(data).foods;
}

export const REMOTE_MIN_QUERY = 3;

/** Пошук в Open Food Facts / USDA через Edge Function (ключі — на сервері). */
export function useRemoteFoodSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['food-search', q.toLowerCase()],
    queryFn: () => searchRemote(q),
    enabled: isSupabaseConfigured && q.length >= REMOTE_MIN_QUERY,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export const isRemoteSearchAvailable = isSupabaseConfigured;

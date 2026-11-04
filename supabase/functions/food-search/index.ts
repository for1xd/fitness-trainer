// Edge Function: пошук продуктів у зовнішніх базах.
// POST { query: string } → { foods: RemoteFood[] }
// POST { barcode: string } → { foods: [RemoteFood] | [] } — товар за штрихкодом з Open Food Facts
// Секрети: USDA_API_KEY (необов'язковий — без нього шукаємо лише в Open Food Facts).
// Деплой: npx supabase functions deploy food-search

import { mapOffProduct, mapUsdaFood, type RemoteFood } from '../_shared/foodMappers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const USER_AGENT = 'FitnessTrainer/1.0 (food search)';
const TIMEOUT_MS = 6000;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url.split('?')[0]} → ${res.status}`);
  return res.json();
}

async function searchOpenFoodFacts(query: string, limit: number): Promise<RemoteFood[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    json: '1',
    page_size: String(limit),
    lc: 'uk',
    fields: 'code,product_name,product_name_uk,brands,serving_quantity,nutriments',
  });
  // Спершу товари, продані в Україні; якщо їх мало — світова база.
  const ua = (await fetchJson(
    `https://ua.openfoodfacts.org/cgi/search.pl?${params}&tagtype_0=countries&tag_contains_0=contains&tag_0=ukraine`,
  )) as { products?: unknown[] };
  let products = ua.products ?? [];
  if (products.length < 5) {
    const world = (await fetchJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}`)) as {
      products?: unknown[];
    };
    products = [...products, ...(world.products ?? [])];
  }
  return products.map((p) => mapOffProduct(p as never)).filter((f): f is RemoteFood => f !== null);
}

async function lookupBarcode(code: string): Promise<RemoteFood[]> {
  const fields = 'code,product_name,product_name_uk,brands,serving_quantity,nutriments';
  const data = (await fetchJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}&lc=uk`,
  )) as { status?: number; product?: unknown };
  if (data.status !== 1 || !data.product) return [];
  const food = mapOffProduct(data.product as never);
  return food ? [food] : [];
}

async function searchUsda(query: string, limit: number): Promise<RemoteFood[]> {
  const key = Deno.env.get('USDA_API_KEY');
  if (!key) return [];
  const params = new URLSearchParams({
    query,
    pageSize: String(limit),
    dataType: 'Foundation,SR Legacy',
    api_key: key,
  });
  const data = (await fetchJson(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`)) as {
    foods?: unknown[];
  };
  return (data.foods ?? [])
    .map((f) => mapUsdaFood(f as never))
    .filter((f): f is RemoteFood => f !== null);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let query = '';
  let barcode = '';
  try {
    const body = (await req.json()) as { query?: unknown; barcode?: unknown };
    query = typeof body.query === 'string' ? body.query.trim() : '';
    barcode = typeof body.barcode === 'string' ? body.barcode.replace(/\D/g, '') : '';
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  if (barcode) {
    if (barcode.length < 8 || barcode.length > 14) return json({ error: 'invalid_barcode' }, 400);
    try {
      return json({ foods: await lookupBarcode(barcode) });
    } catch (e) {
      console.warn('[food-search] barcode', String(e));
      return json({ error: 'lookup_failed' }, 502);
    }
  }

  if (query.length < 2 || query.length > 80) return json({ error: 'invalid_query' }, 400);

  const [off, usda] = await Promise.allSettled([
    searchOpenFoodFacts(query, 20),
    searchUsda(query, 10),
  ]);
  const foods = [
    ...(off.status === 'fulfilled' ? off.value : []),
    ...(usda.status === 'fulfilled' ? usda.value : []),
  ];
  for (const r of [off, usda])
    if (r.status === 'rejected') console.warn('[food-search]', String(r.reason));

  // Унікальні за джерелом і id
  const seen = new Set<string>();
  const unique = foods.filter((f) => {
    const k = `${f.source}:${f.externalId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return json({ foods: unique.slice(0, 30) });
});

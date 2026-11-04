/**
 * Перетворення відповідей Open Food Facts і USDA FoodData Central у спільний формат.
 * Без залежностей від Deno — файл тестується Jest-ом у клієнтському репозиторії.
 */

export interface RemoteFood {
  source: 'off' | 'usda';
  externalId: string;
  name: string;
  brand?: string;
  barcode?: string;
  per100: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  /** Розмір порції з етикетки, г */
  servingG?: number;
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

// ─────────── Open Food Facts ───────────
export interface OffProduct {
  code?: unknown;
  product_name?: unknown;
  product_name_uk?: unknown;
  brands?: unknown;
  serving_quantity?: unknown;
  nutriments?: Record<string, unknown>;
}

export function mapOffProduct(p: OffProduct): RemoteFood | null {
  const name = str(p.product_name_uk) ?? str(p.product_name);
  const code = str(p.code);
  const n = p.nutriments ?? {};
  const protein = num(n['proteins_100g']);
  const fat = num(n['fat_100g']);
  const carbs = num(n['carbohydrates_100g']);
  let kcal = num(n['energy-kcal_100g']);
  const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
  if (kcal === undefined && kj !== undefined) kcal = kj / 4.184;
  if (
    !name ||
    !code ||
    kcal === undefined ||
    protein === undefined ||
    fat === undefined ||
    carbs === undefined
  ) {
    return null;
  }
  // Відсіюємо явно хибні дані етикетки
  if (kcal > 950 || protein + fat + carbs > 105) return null;
  const servingG = num(p.serving_quantity);
  return {
    source: 'off',
    externalId: code,
    barcode: code,
    name,
    brand: str(p.brands)?.split(',')[0]?.trim(),
    per100: { kcal: Math.round(kcal), proteinG: r1(protein), fatG: r1(fat), carbsG: r1(carbs) },
    servingG: servingG && servingG > 0 && servingG < 2000 ? servingG : undefined,
  };
}

// ─────────── USDA FoodData Central ───────────
export interface UsdaFood {
  fdcId?: unknown;
  description?: unknown;
  brandOwner?: unknown;
  brandName?: unknown;
  gtinUpc?: unknown;
  foodNutrients?: { nutrientNumber?: unknown; nutrientId?: unknown; value?: unknown }[];
}

// Номери нутрієнтів USDA: 208 — енергія (ккал), 957/958 — енергія за Атвотером, 203 — білок, 204 — жир, 205 — вуглеводи
export function mapUsdaFood(f: UsdaFood): RemoteFood | null {
  const byNumber = new Map<string, number>();
  for (const n of f.foodNutrients ?? []) {
    const key = String(n.nutrientNumber ?? '');
    const value = num(n.value);
    if (key && value !== undefined && !byNumber.has(key)) byNumber.set(key, value);
  }
  const protein = byNumber.get('203');
  const fat = byNumber.get('204');
  const carbs = byNumber.get('205');
  const name = str(f.description);
  if (
    !name ||
    f.fdcId === undefined ||
    protein === undefined ||
    fat === undefined ||
    carbs === undefined
  ) {
    return null;
  }
  const kcal =
    byNumber.get('208') ??
    byNumber.get('958') ??
    byNumber.get('957') ??
    protein * 4 + fat * 9 + carbs * 4;
  return {
    source: 'usda',
    externalId: String(f.fdcId),
    name,
    brand: str(f.brandName) ?? str(f.brandOwner),
    barcode: str(f.gtinUpc),
    per100: { kcal: Math.round(kcal), proteinG: r1(protein), fatG: r1(fat), carbsG: r1(carbs) },
  };
}

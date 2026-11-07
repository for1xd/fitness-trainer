/**
 * Розпізнавання страви по фото: схема відповіді Claude, промпт і перевірка результату.
 * Без залежностей від Deno — тестується Jest-ом у клієнтському репозиторії.
 */

export interface Per100 {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface KnownDish {
  slug: string;
  name: string;
  per100: Per100;
}

export interface AnalyzedItem {
  name: string;
  /** slug страви з бази, якщо модель її впізнала */
  matchSlug: string | null;
  grams: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** 0…1 */
  confidence: number;
}

export interface MealAnalysis {
  isFood: boolean;
  dishName: string;
  items: AnalyzedItem[];
  overallConfidence: number;
  notes: string;
}

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name_uk: { type: 'string', description: 'Назва продукту чи страви українською' },
    match_slug: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'slug зі списку відомих страв або null',
    },
    grams: { type: 'number', description: 'Орієнтовна вага на фото, г' },
    kcal: { type: 'number' },
    protein_g: { type: 'number' },
    fat_g: { type: 'number' },
    carbs_g: { type: 'number' },
    confidence: { type: 'number', description: 'Впевненість 0–1' },
  },
  required: [
    'name_uk',
    'match_slug',
    'grams',
    'kcal',
    'protein_g',
    'fat_g',
    'carbs_g',
    'confidence',
  ],
  additionalProperties: false,
} as const;

/** JSON-схема для output_config.format (без числових обмежень — їх API не підтримує, перевіряємо в коді). */
export const MEAL_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean' },
    dish_name_uk: { type: 'string' },
    items: { type: 'array', items: ITEM_SCHEMA },
    overall_confidence: { type: 'number' },
    notes_uk: { type: 'string' },
  },
  required: ['is_food', 'dish_name_uk', 'items', 'overall_confidence', 'notes_uk'],
  additionalProperties: false,
} as const;

export function buildSystemPrompt(dishes: KnownDish[]): string {
  const list = dishes.map((d) => `${d.slug} | ${d.name} | ${Math.round(d.per100.kcal)}`).join('\n');
  return `You are the nutrition assistant of a Ukrainian fitness app. You receive one photo of a meal and estimate what is on it, so the user can log it in their food diary. They will review and correct your estimate before saving, so give your honest best guess.

For each separate food you can see:
- name it in Ukrainian (name_uk), the way a Ukrainian would write it in a diary;
- estimate its weight in grams from visual cues: a dinner plate is about 24–26 cm, a deep soup plate filled to the usual level holds about 350–450 g (a small bowl 250–300 g), a fork is about 19 cm, a slice of bread is about 30 g, a glass holds about 250 ml;
- give kcal, protein, fat and carbs for that weight. Keep them consistent: kcal ≈ 4 × protein + 9 × fat + 4 × carbs (alcohol is the exception).

If a food is one of the known dishes below — the same dish with a similar recipe, not just a similar-looking one — set match_slug to its slug and use its name; the app takes per-100 g values from its own database, so for matched dishes the weight matters most. If it is a richer or different variant (a creamy soup versus a clear broth, fried versus boiled, with cheese or mayonnaise added), set match_slug to null and estimate the nutrition yourself. Only use slugs from the list.

Include only what is visible. Count visible sauces, sour cream and oil, but do not add side dishes or drinks you cannot see. List a composite dish (borscht with sour cream, a sandwich) as its parts only when the parts are clearly separate on the plate.

confidence (0 to 1) reflects how sure you are about both what the food is and how much of it there is. Hidden ingredients, mixed dishes, unusual angles or partial views mean lower confidence. overall_confidence summarises the whole plate.

If the photo shows no food (a person, a menu, empty packaging), set is_food to false, return an empty items list and explain in notes_uk.

dish_name_uk: a short name for the whole meal, e.g. «Гречка з котлетою і салатом».
notes_uk: one short sentence in Ukrainian about what most affects accuracy, e.g. «Олії в салаті не видно, тому калорій може бути більше».

Known dishes (slug | name | kcal per 100 g):
${list}`;
}

export const USER_PROMPT = 'Що на цьому фото? Оціни вагу й КБЖВ кожної страви.';

/** Додає коротку підказку користувача (напр. «борщ зі сметаною»). */
export function userPrompt(hint?: string): string {
  const clean = (hint ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return clean ? `${USER_PROMPT}\nПідказка від користувача: ${clean}` : USER_PROMPT;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r1 = (n: number) => Math.round(n * 10) / 10;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Перевіряє відповідь моделі й приводить значення до розумних меж. null — відповідь непридатна. */
export function validateMealAnalysis(
  raw: unknown,
  knownSlugs?: ReadonlySet<string>,
): MealAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.is_food !== 'boolean' || !Array.isArray(r.items)) return null;
  const items: AnalyzedItem[] = [];
  for (const it of r.items) {
    if (!it || typeof it !== 'object') continue;
    const i = it as Record<string, unknown>;
    const name = typeof i.name_uk === 'string' ? i.name_uk.trim() : '';
    if (!name || !isNum(i.grams) || !isNum(i.kcal)) continue;
    const grams = Math.round(clamp(i.grams, 1, 3000));
    const slug = typeof i.match_slug === 'string' && i.match_slug ? i.match_slug : null;
    items.push({
      name: name.slice(0, 120),
      matchSlug: slug && (!knownSlugs || knownSlugs.has(slug)) ? slug : null,
      grams,
      kcal: r1(clamp(i.kcal, 0, 9 * grams)),
      proteinG: r1(clamp(isNum(i.protein_g) ? i.protein_g : 0, 0, grams)),
      fatG: r1(clamp(isNum(i.fat_g) ? i.fat_g : 0, 0, grams)),
      carbsG: r1(clamp(isNum(i.carbs_g) ? i.carbs_g : 0, 0, grams)),
      confidence: r1(clamp(isNum(i.confidence) ? i.confidence : 0.5, 0, 1)),
    });
  }
  return {
    isFood: r.is_food && items.length > 0,
    dishName: typeof r.dish_name_uk === 'string' ? r.dish_name_uk.trim().slice(0, 160) : '',
    items: r.is_food ? items : [],
    overallConfidence: r1(clamp(isNum(r.overall_confidence) ? r.overall_confidence : 0.5, 0, 1)),
    notes: typeof r.notes_uk === 'string' ? r.notes_uk.trim().slice(0, 300) : '',
  };
}

/**
 * Наскільки калорійність на 100 г за оцінкою моделі може відрізнятись від страви з бази,
 * щоб вважати це тією самою стравою. Далі — це інший варіант (напр. вершковий суп з лососем
 * замість юшки), і база дала б хибне число.
 */
export const MATCH_KCAL_TOLERANCE = 0.25;

export function isConsistentMatch(
  item: Pick<AnalyzedItem, 'kcal' | 'grams'>,
  dish: KnownDish,
): boolean {
  if (item.grams <= 0 || dish.per100.kcal <= 0) return true;
  const modelPer100 = (item.kcal / item.grams) * 100;
  const ratio = modelPer100 / dish.per100.kcal;
  return ratio >= 1 - MATCH_KCAL_TOLERANCE && ratio <= 1 / (1 - MATCH_KCAL_TOLERANCE);
}

/**
 * Для впізнаних страв КБЖВ рахується з бази (на 100 г) — точніше, ніж оцінка моделі.
 * Якщо оцінка моделі сильно відрізняється від бази — збіг відкидається, лишається оцінка моделі.
 */
export function applyKnownDishes(
  analysis: MealAnalysis,
  dishes: ReadonlyMap<string, KnownDish>,
): MealAnalysis {
  return {
    ...analysis,
    items: analysis.items.map((item) => {
      const dish = item.matchSlug ? dishes.get(item.matchSlug) : undefined;
      if (!dish) return item;
      if (!isConsistentMatch(item, dish)) return { ...item, matchSlug: null };
      const k = item.grams / 100;
      return {
        ...item,
        name: dish.name,
        kcal: r1(dish.per100.kcal * k),
        proteinG: r1(dish.per100.proteinG * k),
        fatG: r1(dish.per100.fatG * k),
        carbsG: r1(dish.per100.carbsG * k),
      };
    }),
  };
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

/** Тип зображення за першими байтами (не довіряємо розширенню). */
export function sniffImageType(bytes: Uint8Array): ImageMediaType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return 'image/png';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

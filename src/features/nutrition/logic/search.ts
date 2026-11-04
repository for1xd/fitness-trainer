import type { Food } from '../types';

/** Нижній регістр, єдиний апостроф, без пунктуації. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’ʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Типові закінчення: «вареників» → «вареник», «борщу» → «борщ», «котлети» → «котлет».
const ENDINGS = [
  'ами',
  'ями',
  'ові',
  'еві',
  'ах',
  'ях',
  'ів',
  'ей',
  'ом',
  'ем',
  'ою',
  'ею',
  'и',
  'і',
  'у',
  'ю',
  'а',
  'я',
  'е',
  'о',
  'ь',
  'й',
];

export function stem(token: string): string {
  if (token.length < 5) return token;
  for (const end of ENDINGS) {
    if (token.endsWith(end) && token.length - end.length >= 4) return token.slice(0, -end.length);
  }
  return token;
}

/**
 * Оцінка збігу назви з запитом; null — не підходить.
 * Кожне слово запиту має бути початком якогось слова назви (з урахуванням закінчень).
 */
export function matchScore(name: string, query: string): number | null {
  const q = normalize(query);
  if (!q) return null;
  const n = normalize(name);
  const words = n.split(' ');
  let score = 0;
  for (const token of q.split(' ')) {
    const s = stem(token);
    const idx = words.findIndex((w) => w.startsWith(token) || w.startsWith(s));
    if (idx === -1) {
      if (n.includes(token)) score += 1;
      else return null;
    } else {
      score += idx === 0 ? 4 : 3;
    }
  }
  if (n.startsWith(q)) score += 5;
  if (n === q) score += 5;
  // Коротші назви вище: «Борщ український» раніше за «Борщ з квасолею і грибами».
  return score - n.length * 0.01;
}

const SOURCE_BONUS: Record<Food['source'], number> = {
  user: 1.5,
  ua_dish: 1,
  base: 0.8,
  off: 0.3,
  usda: 0,
  ai: 0,
};

export function searchFoods(foods: Food[], query: string, limit = 30): Food[] {
  const scored: { food: Food; score: number }[] = [];
  for (const food of foods) {
    const s = matchScore(food.brand ? `${food.name} ${food.brand}` : food.name, query);
    if (s !== null) scored.push({ food, score: s + SOURCE_BONUS[food.source] });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.food);
}

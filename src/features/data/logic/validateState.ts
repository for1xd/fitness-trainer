/**
 * Перевірка стану сховища з файлу імпорту (без I/O).
 * - Верхній рівень: лише поля, що є в початковому стані, і того самого типу.
 * - Уся глибина: межі глибини, довжини рядків і масивів; числа скінченні.
 * - Довгі рядки дозволено лише для фото: data URI JPEG / PNG / WebP у base64.
 */

export const LIMITS = {
  depth: 12,
  string: 2_000,
  image: 3_000_000,
  array: 50_000,
  keys: 200,
} as const;

const IMAGE_URI = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

type Kind = 'array' | 'object' | 'string' | 'number' | 'boolean' | 'null';

const kindOf = (v: unknown): Kind | 'other' => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  return t === 'object' || t === 'string' || t === 'number' || t === 'boolean'
    ? (t as Kind)
    : 'other';
};

function checkValue(v: unknown, depth: number): boolean {
  if (depth > LIMITS.depth) return false;
  switch (kindOf(v)) {
    case 'null':
    case 'boolean':
      return true;
    case 'number':
      return Number.isFinite(v as number);
    case 'string': {
      const s = v as string;
      if (s.length <= LIMITS.string) return true;
      return s.length <= LIMITS.image && IMAGE_URI.test(s);
    }
    case 'array': {
      const a = v as unknown[];
      return a.length <= LIMITS.array && a.every((x) => checkValue(x, depth + 1));
    }
    case 'object': {
      const entries = Object.entries(v as Record<string, unknown>);
      return (
        entries.length <= LIMITS.keys &&
        entries.every(
          ([k, x]) => k.length <= 64 && !FORBIDDEN_KEYS.has(k) && checkValue(x, depth + 1),
        )
      );
    }
    default:
      return false;
  }
}

/**
 * true, якщо `state` можна безпечно підставити у сховище з початковим станом `initial`.
 * Невідоме поле або поле іншого типу → false (файл відхиляється повністю).
 */
export function isValidStoreState(
  state: Record<string, unknown>,
  initial: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(state)) {
    if (!(key in initial) || typeof initial[key] === 'function') return false;
    const expected = kindOf(initial[key]);
    const actual = kindOf(value);
    // Поле, що спочатку null (профіль, дата, рівень досвіду), може мати будь-який перевірений тип
    const typeOk = expected === 'null' || actual === expected || actual === 'null';
    if (!typeOk || !checkValue(value, 1)) return false;
  }
  return true;
}

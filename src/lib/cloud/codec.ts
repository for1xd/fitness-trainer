/**
 * Перетворення збереженого JSON для сховища артефакта (без I/O, тестується Jest).
 * Документ там — до 256 КБ, тому:
 * - фото (data URI) виносяться в окремі записи й замінюються посиланням `blobref:<hash>`;
 * - довгий текст ділиться на частини.
 */

/** Символів у частині: кирилиця в UTF-8 — 2 байти, тож ≈160 КБ із запасом до межі 256 КБ. */
export const CHUNK_CHARS = 80_000;

const DATA_URI = /"(data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+)"/g;
const BLOB_REF = /"blobref:([0-9a-z]+)"/g;

/** Короткий стабільний хеш рядка (FNV-1a 32 біти + довжина) — ключ запису фото. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

/** Виносить data URI з JSON: повертає JSON із посиланнями і самі фото за хешем. */
export function extractBlobs(json: string): { json: string; blobs: Map<string, string> } {
  const blobs = new Map<string, string>();
  const out = json.replace(DATA_URI, (_m, uri: string) => {
    const key = hashString(uri);
    blobs.set(key, uri);
    return `"blobref:${key}"`;
  });
  return { json: out, blobs };
}

/** Хеші фото, на які посилається JSON. */
export function blobRefs(json: string): Set<string> {
  const refs = new Set<string>();
  for (const m of json.matchAll(BLOB_REF)) if (m[1]) refs.add(m[1]);
  return refs;
}

/** Повертає фото на місце посилань; невідоме посилання стає порожнім рядком. */
export function restoreBlobs(json: string, blobs: ReadonlyMap<string, string>): string {
  return json.replace(BLOB_REF, (_m, key: string) => JSON.stringify(blobs.get(key) ?? ''));
}

export function splitChunks(text: string, size = CHUNK_CHARS): string[] {
  if (text.length <= size) return [text];
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

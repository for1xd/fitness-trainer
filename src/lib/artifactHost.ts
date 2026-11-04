import { Platform } from 'react-native';

/**
 * Запуск усередині артефакту Claude (claude.ai). Там мережа сторінки закрита, але є можливості
 * платформи: `sample` — запит до Claude від імені того, хто відкрив артефакт (зокрема з фото).
 * Поза артефактом усе це повертає null, і застосунок працює як звичайно.
 */

export interface ArtifactSampleOptions {
  images?: Blob[];
  modelTier?: 'quick' | 'default' | 'complex';
  cache?: boolean;
  signal?: AbortSignal;
}

export interface ArtifactSampleError {
  code: string;
  message?: string;
}

export interface ArtifactSample {
  json<T = unknown>(input: string, options?: ArtifactSampleOptions): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number; mediaTypes: string[] } }>;
}

interface ClaudeHost {
  use(name: string): Promise<unknown>;
}

const host = (): ClaudeHost | null => {
  if (Platform.OS !== 'web') return null;
  const c = (globalThis as { claude?: Partial<ClaudeHost> }).claude;
  return c && typeof c.use === 'function' ? (c as ClaudeHost) : null;
};

/** Сторінку відкрито в переглядачі артефактів Claude. */
export const isArtifactHost = () => host() !== null;

let samplePromise: Promise<ArtifactSample | null> | null = null;

export function getArtifactSample(): Promise<ArtifactSample | null> {
  const h = host();
  if (!h) return Promise.resolve(null);
  samplePromise ??= h
    .use('sample')
    .then((s) => (s ? (s as ArtifactSample) : null))
    .catch(() => null);
  return samplePromise;
}

/** Чи може цей перегляд надсилати фото Claude (артефакт оголошує images і переглядач це дозволяє). */
export async function artifactCanSendImages(): Promise<boolean> {
  const sample = await getArtifactSample();
  if (!sample) return false;
  const limits = await sample.limits().catch(() => null);
  return !!limits?.images;
}

export const isSampleError = (e: unknown): e is ArtifactSampleError =>
  typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string';
